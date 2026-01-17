# Code snippets for Vim-style typing tests

# Python code snippets
PYTHON_SNIPPETS = [
    '''def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)''',
    
    '''class Stack:
    def __init__(self):
        self.items = []
    
    def push(self, item):
        self.items.append(item)
    
    def pop(self):
        return self.items.pop()''',
    
    '''def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1''',
    
    '''@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])''',
    
    '''def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)''',
    
    '''with open('data.json', 'r') as f:
    data = json.load(f)
    for item in data['items']:
        process(item)''',
    
    '''async def fetch_data(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()''',
    
    '''def decorator(func):
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper''',
]

# JavaScript/TypeScript code snippets
JAVASCRIPT_SNIPPETS = [
    '''const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(error);
  }
};''',
    
    '''function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}''',
    
    '''const useState = (initialValue) => {
  let state = initialValue;
  const getState = () => state;
  const setState = (newValue) => {
    state = newValue;
    render();
  };
  return [getState, setState];
};''',
    
    '''class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  emit(event, data) {
    this.events[event]?.forEach(cb => cb(data));
  }
}''',
    
    '''const quickSort = (arr) => {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x < pivot);
  const right = arr.slice(1).filter(x => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
};''',
    
    '''export default function Button({ onClick, children }) {
  return (
    <button
      className="btn btn-primary"
      onClick={onClick}
    >
      {children}
    </button>
  );
}''',

    '''const router = express.Router();

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});''',
]

# Rust code snippets
RUST_SNIPPETS = [
    '''fn main() {
    let numbers: Vec<i32> = (1..=10).collect();
    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);
}''',
    
    '''impl Iterator for Counter {
    type Item = u32;
    
    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count < 6 {
            Some(self.count)
        } else {
            None
        }
    }
}''',
    
    '''fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {
    let mut left = 0;
    let mut right = arr.len();
    while left < right {
        let mid = left + (right - left) / 2;
        match arr[mid].cmp(target) {
            Ordering::Equal => return Some(mid),
            Ordering::Less => left = mid + 1,
            Ordering::Greater => right = mid,
        }
    }
    None
}''',
    
    '''#[derive(Debug, Clone)]
struct User {
    id: u32,
    name: String,
    email: String,
}

impl User {
    fn new(id: u32, name: &str, email: &str) -> Self {
        Self {
            id,
            name: name.to_string(),
            email: email.to_string(),
        }
    }
}''',
]

# Go code snippets
GO_SNIPPETS = [
    '''func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, World!")
}''',
    
    '''func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("worker %d processing job %d\\n", id, j)
        results <- j * 2
    }
}''',
    
    '''type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
}

func (u *User) Validate() error {
    if u.Username == "" {
        return errors.New("username required")
    }
    return nil
}''',
]

# C/C++ code snippets
C_SNIPPETS = [
    '''int main() {
    int *arr = malloc(10 * sizeof(int));
    for (int i = 0; i < 10; i++) {
        arr[i] = i * i;
    }
    free(arr);
    return 0;
}''',
    
    '''void quicksort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quicksort(arr, low, pi - 1);
        quicksort(arr, pi + 1, high);
    }
}''',
    
    '''struct Node {
    int data;
    struct Node* next;
};

void insert(struct Node** head, int data) {
    struct Node* new_node = malloc(sizeof(struct Node));
    new_node->data = data;
    new_node->next = *head;
    *head = new_node;
}''',
]

# All snippets organized by language
CODE_SNIPPETS = {
    'python': PYTHON_SNIPPETS,
    'javascript': JAVASCRIPT_SNIPPETS,
    'typescript': JAVASCRIPT_SNIPPETS,
    'rust': RUST_SNIPPETS,
    'go': GO_SNIPPETS,
    'c': C_SNIPPETS,
    'cpp': C_SNIPPETS,
}

# Vim commands for practice
VIM_COMMANDS = [
    "dd",      # delete line
    "yy",      # yank line
    "p",       # paste
    "ciw",     # change inner word
    "diw",     # delete inner word
    "gg",      # go to top
    "G",       # go to bottom
    ":wq",     # save and quit
    ":q!",     # quit without saving
    "/search", # search
    "n",       # next search result
    "N",       # previous search result
    ":%s/old/new/g",  # replace all
    "vip",     # select paragraph
    "=G",      # indent to end
    "zz",      # center cursor
    "ctrl+d",  # page down
    "ctrl+u",  # page up
    "o",       # new line below
    "O",       # new line above
    "A",       # append end of line
    "I",       # insert start of line
    "w",       # next word
    "b",       # previous word
    "0",       # start of line
    "$",       # end of line
    "f{char}", # find char forward
    "t{char}", # till char forward
    "ci(",     # change inside parens
    "da\"",    # delete around quotes
]
